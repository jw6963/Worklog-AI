package com.worklog.backend.integration;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import java.time.LocalDate;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import com.jayway.jsonpath.JsonPath;
import com.worklog.backend.project.Project;
import com.worklog.backend.project.ProjectController;
import com.worklog.backend.project.ProjectRepository;
import com.worklog.backend.workitem.WorkItem;
import com.worklog.backend.workitem.WorkItemController;
import com.worklog.backend.workitem.WorkItemRepository;

@SpringBootTest(properties = {
		"spring.datasource.url=jdbc:h2:mem:worklog-test;DB_CLOSE_DELAY=-1",
		"worklog.admin.password=worklog1234"
})
@AutoConfigureMockMvc
class BackendApplicationTests {
	@Autowired WorkItemController workItemController;
	@Autowired ProjectController projectController;
	@Autowired WorkItemRepository workItemRepository;
	@Autowired ProjectRepository projectRepository;
	@Autowired MockMvc mockMvc;
	private final Authentication admin = new UsernamePasswordAuthenticationToken(
			"admin", "", java.util.List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));

	@BeforeEach
	void cleanDatabase() {
		workItemRepository.deleteAll();
		projectRepository.deleteAll();
	}

	@Test
	void contextLoads() {
	}

	@Test
	void protectsApiAndCreatesAuthenticatedSession() throws Exception {
		mockMvc.perform(get("/api/items").param("date", "2026-08-03"))
				.andExpect(status().isUnauthorized());

		MockHttpSession session = (MockHttpSession) mockMvc.perform(post("/api/auth/login")
					.contentType("application/json")
					.content("{\"username\":\"admin\",\"password\":\"worklog1234\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.username").value("admin"))
				.andReturn().getRequest().getSession(false);

		mockMvc.perform(get("/api/auth/me").session(session))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.displayName").value("내 Worklog"));
		mockMvc.perform(get("/api/items").param("date", "2026-08-03").session(session))
				.andExpect(status().isOk());
	}

	@Test
	void adminCreatesUserWhoMustChangePasswordAndCannotSeeAdminData() throws Exception {
		MockHttpSession adminSession = login("admin", "worklog1234");
		String created = mockMvc.perform(post("/api/admin/users").session(adminSession)
				.contentType("application/json")
				.content("{\"username\":\"isolated-user\",\"displayName\":\"Isolated User\"}"))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.user.mustChangePassword").value(true))
				.andReturn().getResponse().getContentAsString();
		String temporaryPassword = JsonPath.read(created, "$.temporaryPassword");
		Integer userId = JsonPath.read(created, "$.user.id");

		MockHttpSession userSession = login("isolated-user", temporaryPassword);
		mockMvc.perform(get("/api/items").session(userSession).param("date", "2030-01-01"))
				.andExpect(status().is(428));
		mockMvc.perform(post("/api/auth/change-password").session(userSession)
				.contentType("application/json")
				.content("{\"newPassword\":\"changed-password-2030\"}"))
				.andExpect(status().isNoContent());
		mockMvc.perform(post("/api/items").session(userSession)
				.contentType("application/json")
				.content("{\"workDate\":\"2030-01-01\",\"type\":\"TODO\",\"content\":\"private item\"}"))
				.andExpect(status().isCreated());
		mockMvc.perform(post("/api/auth/change-password").session(userSession)
				.contentType("application/json")
				.content("{\"currentPassword\":\"wrong-password\",\"newPassword\":\"another-password-2030\"}"))
				.andExpect(status().isBadRequest());
		mockMvc.perform(post("/api/auth/change-password").session(userSession)
				.contentType("application/json")
				.content("{\"currentPassword\":\"changed-password-2030\",\"newPassword\":\"another-password-2030\"}"))
				.andExpect(status().isNoContent());

		mockMvc.perform(get("/api/items").session(adminSession).param("date", "2030-01-01"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.length()").value(0));
		mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch("/api/admin/users/{id}/enabled", userId)
				.session(adminSession).contentType("application/json").content("{\"enabled\":false}"))
				.andExpect(status().isOk());
		mockMvc.perform(get("/api/items").session(userSession).param("date", "2030-01-01"))
				.andExpect(status().isUnauthorized());
	}

	private MockHttpSession login(String username, String password) throws Exception {
		return (MockHttpSession) mockMvc.perform(post("/api/auth/login")
				.contentType("application/json")
				.content("{\"username\":\"" + username + "\",\"password\":\"" + password + "\"}"))
				.andExpect(status().isOk())
				.andReturn().getRequest().getSession(false);
	}

	@Test
	void editsCarriesOverAndRestoresProjectBackup() {
		Project project = projectController.create(new ProjectController.CreateProjectRequest("Worklog", "#4b8063"), admin);
		LocalDate yesterday = LocalDate.of(2026, 8, 2);
		LocalDate today = LocalDate.of(2026, 8, 3);
		WorkItem source = workItemController.create(new WorkItemController.CreateRequest(
				yesterday, WorkItem.ItemType.TODO, "unfinished task", project.getId()), admin);

		WorkItem edited = workItemController.changeContent(source.getId(),
				new WorkItemController.ContentRequest("edited task"), admin);
		assertThat(edited.getContent()).isEqualTo("edited task");

		assertThat(workItemController.carryOver(new WorkItemController.CarryOverRequest(yesterday, today), admin))
				.singleElement().satisfies(item -> assertThat(item.getProject().getName()).isEqualTo("Worklog"));
		assertThat(workItemController.carryOver(new WorkItemController.CarryOverRequest(yesterday, today), admin)).isEmpty();

		WorkItemController.BackupResponse backup = workItemController.backup(admin);
		assertThat(backup.schemaVersion()).isEqualTo(2);
		assertThat(backup.projects()).hasSize(1);
		assertThat(backup.items()).hasSize(2);

		workItemController.restore(new WorkItemController.RestoreRequest(
				backup.schemaVersion(), true, backup.projects(), backup.items()), admin);
		assertThat(projectRepository.findAll()).hasSize(1);
		assertThat(workItemRepository.findAll()).hasSize(2).allSatisfy(item ->
				assertThat(item.getProject().getName()).isEqualTo("Worklog"));

		Project restoredProject = projectRepository.findAll().getFirst();
		assertThatThrownBy(() -> projectController.delete(restoredProject.getId(), false, admin))
				.isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
		projectController.delete(restoredProject.getId(), true, admin);
		assertThat(projectRepository.findAll()).isEmpty();
		assertThat(workItemRepository.findAll()).allSatisfy(item -> assertThat(item.getProject()).isNull());
	}

	@Test
	void searchesWorkItemsTenDatesAtATime() {
		LocalDate today = LocalDate.of(2026, 8, 3);
		for (int day = 0; day < 12; day++) {
			workItemController.create(new WorkItemController.CreateRequest(
					today.minusDays(day), WorkItem.ItemType.TODO, "paged task " + day, null), admin);
		}

		WorkItemController.SearchResponse first = workItemController.search(
				today.minusDays(30), today, null, null, null, "paged", 10, admin);
		assertThat(first.items()).hasSize(10);
		assertThat(first.totalItems()).isEqualTo(12);
		assertThat(first.totalDays()).isEqualTo(12);
		assertThat(first.hasMore()).isTrue();

		WorkItemController.SearchResponse second = workItemController.search(
				today.minusDays(30), today, first.nextBeforeDate(), null, null, "paged", 10, admin);
		assertThat(second.items()).hasSize(2);
		assertThat(second.hasMore()).isFalse();
	}

}
