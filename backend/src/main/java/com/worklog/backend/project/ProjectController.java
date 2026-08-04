package com.worklog.backend.project;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.Authentication;
import com.worklog.backend.auth.CurrentUser;
import com.worklog.backend.user.AppUser;
import com.worklog.backend.workitem.WorkItem;
import com.worklog.backend.workitem.WorkItemRepository;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {
    private final ProjectRepository repository;
    private final WorkItemRepository workItemRepository;
    private final CurrentUser currentUser;
    public ProjectController(ProjectRepository repository, WorkItemRepository workItemRepository, CurrentUser currentUser) {
        this.repository = repository;
        this.workItemRepository = workItemRepository;
        this.currentUser = currentUser;
    }

    @GetMapping
    public List<ProjectView> list(Authentication auth) {
        Long ownerId = currentUser.get(auth).getId();
        Map<Long, WorkItemRepository.ProjectStats> statsByProject = workItemRepository.summarizeByProject(ownerId).stream()
                .collect(Collectors.toMap(WorkItemRepository.ProjectStats::getProjectId, stats -> stats));
        return repository.findByOwnerIdOrderByArchivedAscNameAsc(ownerId).stream()
                .map(project -> projectView(project, ownerId, statsByProject.get(project.getId())))
                .toList();
    }

    private ProjectView projectView(Project project, Long ownerId, WorkItemRepository.ProjectStats stats) {
        List<ProjectActivity> recentItems = workItemRepository
                .findByOwnerIdAndProjectIdAndCarriedToDateIsNullOrderByWorkDateDescCreatedAtDesc(
                        ownerId, project.getId(), PageRequest.of(0, 2)).stream()
                .map(item -> new ProjectActivity(item.getId(), item.getWorkDate(), item.getType(), item.getContent()))
                .toList();
        return new ProjectView(project.getId(), project.getName(), project.getColor(), project.isArchived(),
                stats == null ? 0 : stats.getItemCount(), stats == null ? 0 : stats.getTodoCount(),
                stats == null ? 0 : stats.getDoneCount(), stats == null ? 0 : stats.getNoteCount(),
                stats == null ? null : stats.getLatestWorkDate(), recentItems);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Project create(@Valid @RequestBody CreateProjectRequest request, Authentication auth) {
        return repository.save(new Project(request.name(), request.color() == null ? "#6b8f71" : request.color(), currentUser.get(auth)));
    }

    @PatchMapping("/{id}/archived")
    public Project archive(@PathVariable Long id, @RequestBody ArchiveRequest request, Authentication auth) {
        Project project = ownedProject(id, auth);
        project.setArchived(request.archived());
        return repository.save(project);
    }

    @PatchMapping("/{id}")
    public Project update(@PathVariable Long id, @Valid @RequestBody UpdateProjectRequest request, Authentication auth) {
        Project project = ownedProject(id, auth);
        project.setName(request.name());
        project.setColor(request.color());
        return repository.save(project);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @org.springframework.transaction.annotation.Transactional
    public void delete(@PathVariable Long id, @RequestParam(defaultValue = "false") boolean detachItems, Authentication auth) {
        AppUser owner = currentUser.get(auth);
        Project project = repository.findByIdAndOwnerId(id, owner.getId()).orElseThrow();
        List<WorkItem> assignedItems = workItemRepository.findByOwnerIdAndProjectId(owner.getId(), id);
        if (!assignedItems.isEmpty() && !detachItems) {
            throw new org.springframework.web.server.ResponseStatusException(
                    HttpStatus.CONFLICT, "Project is assigned to " + assignedItems.size() + " work items");
        }
        if (detachItems) {
            assignedItems.forEach(item -> item.setProject(null));
            workItemRepository.saveAll(assignedItems);
        }
        repository.delete(project);
    }

    @PostMapping("/{id}/transfer")
    @org.springframework.transaction.annotation.Transactional
    public TransferResponse transfer(@PathVariable Long id, @Valid @RequestBody TransferRequest request,
                                     Authentication auth) {
        AppUser owner = currentUser.get(auth);
        Project source = repository.findByIdAndOwnerId(id, owner.getId()).orElseThrow();
        Project target = repository.findByIdAndOwnerId(request.targetProjectId(), owner.getId()).orElseThrow();
        if (source.getId().equals(target.getId())) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Source and target projects must be different");
        }
        if (target.isArchived()) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.CONFLICT,
                    "Cannot transfer items to an archived project");
        }
        List<WorkItem> assignedItems = workItemRepository.findByOwnerIdAndProjectId(owner.getId(), source.getId());
        assignedItems.forEach(item -> item.setProject(target));
        workItemRepository.saveAll(assignedItems);
        return new TransferResponse(assignedItems.size(), target.getId());
    }

    private Project ownedProject(Long id, Authentication auth) {
        return repository.findByIdAndOwnerId(id, currentUser.get(auth).getId()).orElseThrow();
    }

    public record CreateProjectRequest(@NotBlank String name, String color) {}
    public record ArchiveRequest(boolean archived) {}
    public record UpdateProjectRequest(@NotBlank String name, @NotBlank String color) {}
    public record ProjectActivity(Long id, LocalDate workDate, WorkItem.ItemType type, String content) {}
    public record ProjectView(Long id, String name, String color, boolean archived, long itemCount,
                              long todoCount, long doneCount, long noteCount, LocalDate latestWorkDate,
                              List<ProjectActivity> recentItems) {}
    public record TransferRequest(@NotNull Long targetProjectId) {}
    public record TransferResponse(int movedCount, Long targetProjectId) {}
}
