package com.worklog.backend.integration;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.mock.web.MockMultipartFile;
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
import com.worklog.backend.user.AppUserRepository;
import com.worklog.backend.search.SavedSearchController;
import com.worklog.backend.search.SavedSearchRepository;

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
	@Autowired AppUserRepository appUserRepository;
	@Autowired SavedSearchController savedSearchController;
	@Autowired SavedSearchRepository savedSearchRepository;
	private final Authentication admin = new UsernamePasswordAuthenticationToken(
			"admin", "", java.util.List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));

	@BeforeEach
	void cleanDatabase() {
		savedSearchRepository.deleteAll();
		workItemRepository.deleteAll();
		projectRepository.deleteAll();
		appUserRepository.findByUsername("admin").ifPresent(user -> {
			user.resetLoginFailures();
			appUserRepository.save(user);
		});
	}

	@Test
	void contextLoads() {
	}

	@Test
	void savesAndDeletesAccountSearchFilters() {
		SavedSearchController.Request request = new SavedSearchController.Request(
				"Open project work", "14D", null, null, "TODO", null, "release");
		var saved = savedSearchController.create(request, admin);

		assertThat(savedSearchController.list(admin)).singleElement().satisfies(filter -> {
			assertThat(filter.getName()).isEqualTo("Open project work");
			assertThat(filter.getPeriod()).isEqualTo("14D");
			assertThat(filter.getItemType()).isEqualTo("TODO");
			assertThat(filter.getQuery()).isEqualTo("release");
		});

		savedSearchController.delete(saved.getId(), admin);
		assertThat(savedSearchController.list(admin)).isEmpty();
		workItemController.restore(new WorkItemController.RestoreRequest(
				3, true, java.util.List.of(), java.util.List.of(), null), admin);
		assertThat(savedSearchController.list(admin)).isEmpty();
	}

	@Test
	void protectsApiAndCreatesAuthenticatedSession() throws Exception {
		mockMvc.perform(get("/api/items").param("date", "2026-08-03"))
				.andExpect(status().isUnauthorized())
				.andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header()
						.string("Content-Security-Policy", org.hamcrest.Matchers.containsString("default-src 'self'")))
				.andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header()
						.string("Permissions-Policy", org.hamcrest.Matchers.containsString("camera=()")));

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
	void countsFailedLoginsAndLocksAccountAfterTenAttempts() throws Exception {
		for (int attempt = 1; attempt <= 9; attempt++) {
			mockMvc.perform(post("/api/auth/login")
					.contentType("application/json")
					.content("{\"username\":\"admin\",\"password\":\"wrong-password\"}"))
					.andExpect(status().isUnauthorized())
					.andExpect(jsonPath("$.failedAttempts").value(attempt))
					.andExpect(jsonPath("$.remainingAttempts").value(10 - attempt));
		}

		mockMvc.perform(post("/api/auth/login")
				.contentType("application/json")
				.content("{\"username\":\"admin\",\"password\":\"wrong-password\"}"))
				.andExpect(status().is(423))
				.andExpect(jsonPath("$.failedAttempts").value(10))
				.andExpect(jsonPath("$.remainingAttempts").value(0))
				.andExpect(jsonPath("$.lockedUntil").isNotEmpty());

		mockMvc.perform(post("/api/auth/login")
				.contentType("application/json")
				.content("{\"username\":\"admin\",\"password\":\"worklog1234\"}"))
				.andExpect(status().is(423));
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

		MockHttpSession userSession = login("ISOLATED-USER", temporaryPassword);
		mockMvc.perform(get("/api/items").session(userSession).param("date", "2030-01-01"))
				.andExpect(status().is(428));
		mockMvc.perform(post("/api/auth/change-password").session(userSession)
				.contentType("application/json")
				.content("{\"newPassword\":\"changed-password-2030\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.showGuide").value(true));
		mockMvc.perform(post("/api/items").session(userSession)
				.contentType("application/json")
				.content("{\"workDate\":\"2030-01-01\",\"type\":\"TODO\",\"content\":\"private item\"}"))
				.andExpect(status().isCreated());
		mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch("/api/auth/profile")
				.session(userSession).contentType("application/json").content("{\"displayName\":\"Updated User\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.displayName").value("Updated User"));
		MockMultipartFile avatar = new MockMultipartFile("file", "avatar.png", "image/png",
				new byte[] {(byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a});
		mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart("/api/auth/avatar")
				.file(avatar).session(userSession))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.hasAvatar").value(true));
		mockMvc.perform(get("/api/auth/avatar").session(userSession))
				.andExpect(status().isOk())
				.andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.content().contentType("image/png"));
		mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete("/api/auth/avatar")
				.session(userSession))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.hasAvatar").value(false));
		mockMvc.perform(post("/api/auth/change-password").session(userSession)
				.contentType("application/json")
				.content("{\"currentPassword\":\"wrong-password\",\"newPassword\":\"another-password-2030\"}"))
				.andExpect(status().isBadRequest());
		mockMvc.perform(post("/api/auth/change-password").session(userSession)
				.contentType("application/json")
				.content("{\"currentPassword\":\"changed-password-2030\",\"newPassword\":\"another-password-2030\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.showGuide").value(false));

		String reset = mockMvc.perform(post("/api/admin/users/{id}/reset-password", userId).session(adminSession))
				.andExpect(status().isOk())
				.andReturn().getResponse().getContentAsString();
		String resetPassword = JsonPath.read(reset, "$.temporaryPassword");
		MockHttpSession resetSession = login("isolated-user", resetPassword);
		mockMvc.perform(post("/api/auth/change-password").session(resetSession)
				.contentType("application/json")
				.content("{\"newPassword\":\"password-after-admin-reset\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.showGuide").value(false));

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

		WorkItem carried = workItemController.carryOver(new WorkItemController.CarryOverRequest(yesterday, today), admin)
				.getFirst();
		assertThat(carried.getProject().getName()).isEqualTo("Worklog");
		assertThat(carried.getFlowId()).isNotBlank();
		WorkItem carriedSource = workItemRepository.findById(source.getId()).orElseThrow();
		assertThat(carriedSource.getCarriedToDate()).isEqualTo(today);
		assertThat(carriedSource.getFlowCurrentDate()).isEqualTo(today);
		assertThat(workItemController.carryOver(new WorkItemController.CarryOverRequest(yesterday, today), admin)).isEmpty();

		WorkItem completedFromPast = workItemController.changeType(source.getId(),
				new WorkItemController.TypeRequest(WorkItem.ItemType.DONE), admin);
		assertThat(completedFromPast.getId()).isEqualTo(carried.getId());
		assertThat(completedFromPast.getType()).isEqualTo(WorkItem.ItemType.DONE);
		assertThat(workItemRepository.findById(source.getId()).orElseThrow().getFlowCompletedDate()).isEqualTo(today);
		WorkItemController.SearchResponse openTodos = workItemController.search(
				yesterday, today, null, WorkItem.ItemType.TODO, null, "", 10, admin);
		assertThat(openTodos.totalItems()).isZero();

		workItemController.changeType(source.getId(), new WorkItemController.TypeRequest(WorkItem.ItemType.TODO), admin);
		openTodos = workItemController.search(yesterday, today, null, WorkItem.ItemType.TODO, null, "", 10, admin);
		assertThat(openTodos.items()).singleElement().satisfies(item -> assertThat(item.getId()).isEqualTo(carried.getId()));
		workItemController.changeContent(carried.getId(), new WorkItemController.ContentRequest("synced task"), admin);
		assertThat(workItemRepository.findById(source.getId()).orElseThrow().getContent()).isEqualTo("synced task");
		workItemController.changeProject(carried.getId(), new WorkItemController.ProjectRequest(null), admin);
		assertThat(workItemRepository.findById(source.getId()).orElseThrow().getProject()).isNull();
		workItemController.changeProject(carried.getId(), new WorkItemController.ProjectRequest(project.getId()), admin);
		savedSearchController.create(new SavedSearchController.Request(
				"Worklog TODO", "30D", null, null, "TODO", project.getId(), "synced"), admin);

		WorkItemController.BackupResponse backup = workItemController.backup(admin);
		assertThat(backup.schemaVersion()).isEqualTo(4);
		assertThat(backup.projects()).hasSize(1);
		assertThat(backup.items()).hasSize(2);
		assertThat(backup.savedSearches()).hasSize(1);

		workItemController.restore(new WorkItemController.RestoreRequest(
				backup.schemaVersion(), true, backup.projects(), backup.items(), backup.savedSearches()), admin);
		assertThat(projectRepository.findAll()).hasSize(1);
		assertThat(workItemRepository.findAll()).hasSize(2).allSatisfy(item ->
				assertThat(item.getProject().getName()).isEqualTo("Worklog"));
		assertThat(workItemRepository.findAll()).allSatisfy(item -> assertThat(item.getFlowId()).isNotBlank());

		Project restoredProject = projectRepository.findAll().getFirst();
		assertThat(savedSearchRepository.findAll()).singleElement().satisfies(saved -> {
			assertThat(saved.getName()).isEqualTo("Worklog TODO");
			assertThat(saved.getProjectId()).isEqualTo(restoredProject.getId());
		});
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

	@Test
	void cancelsOnlyTheLatestOpenCarryOver() {
		LocalDate yesterday = LocalDate.of(2026, 8, 3);
		LocalDate today = LocalDate.of(2026, 8, 4);
		WorkItem source = workItemController.create(new WorkItemController.CreateRequest(
				yesterday, WorkItem.ItemType.TODO, "cancelled carry", null), admin);
		WorkItem current = workItemController.carryOver(
				new WorkItemController.CarryOverRequest(yesterday, today), admin).getFirst();

		WorkItem restored = workItemController.cancelCarryOver(current.getId(), admin);

		assertThat(restored.getId()).isEqualTo(source.getId());
		assertThat(restored.getCarriedToDate()).isNull();
		assertThat(restored.getFlowCurrentDate()).isEqualTo(yesterday);
		assertThat(workItemRepository.findById(current.getId())).isEmpty();
		assertThat(workItemController.search(yesterday, today, null, WorkItem.ItemType.TODO,
				null, "", 10, admin).items()).singleElement().extracting(WorkItem::getId).isEqualTo(source.getId());
	}

	@Test
	void summarizesAndTransfersProjectActivity() {
		Project source = projectController.create(new ProjectController.CreateProjectRequest("Source", "#4b8063"), admin);
		Project target = projectController.create(new ProjectController.CreateProjectRequest("Target", "#4f6f9f"), admin);
		LocalDate firstDay = LocalDate.of(2026, 8, 1);
		LocalDate latestDay = LocalDate.of(2026, 8, 4);
		workItemController.create(new WorkItemController.CreateRequest(firstDay, WorkItem.ItemType.TODO,
				"open task", source.getId()), admin);
		workItemController.create(new WorkItemController.CreateRequest(latestDay, WorkItem.ItemType.DONE,
				"finished task", source.getId()), admin);
		workItemController.create(new WorkItemController.CreateRequest(latestDay, WorkItem.ItemType.NOTE,
				"learned note", source.getId()), admin);

		ProjectController.ProjectView sourceView = projectController.list(admin).stream()
				.filter(project -> project.id().equals(source.getId())).findFirst().orElseThrow();
		assertThat(sourceView.itemCount()).isEqualTo(3);
		assertThat(sourceView.todoCount()).isEqualTo(1);
		assertThat(sourceView.doneCount()).isEqualTo(1);
		assertThat(sourceView.noteCount()).isEqualTo(1);
		assertThat(sourceView.latestWorkDate()).isEqualTo(latestDay);
		assertThat(sourceView.recentItems()).hasSize(2);

		ProjectController.TransferResponse result = projectController.transfer(source.getId(),
				new ProjectController.TransferRequest(target.getId()), admin);
		assertThat(result.movedCount()).isEqualTo(3);
		assertThat(workItemRepository.findAll()).allSatisfy(item ->
				assertThat(item.getProject().getId()).isEqualTo(target.getId()));
	}

}
