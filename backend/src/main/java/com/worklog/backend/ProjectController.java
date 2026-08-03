package com.worklog.backend;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import org.springframework.security.core.Authentication;

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
        return repository.findByOwnerIdOrderByArchivedAscNameAsc(ownerId).stream()
                .map(project -> new ProjectView(project.getId(), project.getName(), project.getColor(),
                        project.isArchived(), workItemRepository.countByOwnerIdAndProjectId(ownerId, project.getId())))
                .toList();
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

    private Project ownedProject(Long id, Authentication auth) {
        return repository.findByIdAndOwnerId(id, currentUser.get(auth).getId()).orElseThrow();
    }

    public record CreateProjectRequest(@NotBlank String name, String color) {}
    public record ArchiveRequest(boolean archived) {}
    public record UpdateProjectRequest(@NotBlank String name, @NotBlank String color) {}
    public record ProjectView(Long id, String name, String color, boolean archived, long itemCount) {}
}
