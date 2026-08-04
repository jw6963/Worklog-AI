package com.worklog.backend.workitem;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.time.Instant;
import java.util.Comparator;
import java.util.HashMap;
import java.util.Map;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.security.core.Authentication;
import com.worklog.backend.auth.CurrentUser;
import com.worklog.backend.project.Project;
import com.worklog.backend.project.ProjectRepository;
import com.worklog.backend.user.AppUser;

@RestController
@RequestMapping("/api/items")
public class WorkItemController {
    private final WorkItemRepository repository;
    private final ProjectRepository projectRepository;
    private final CurrentUser currentUser;

    public WorkItemController(WorkItemRepository repository, ProjectRepository projectRepository, CurrentUser currentUser) {
        this.repository = repository;
        this.projectRepository = projectRepository;
        this.currentUser = currentUser;
    }

    @GetMapping
    public List<WorkItem> list(@RequestParam LocalDate date, Authentication auth) {
        return repository.findByOwnerIdAndWorkDateOrderByCreatedAtAsc(currentUser.get(auth).getId(), date);
    }

    @GetMapping("/range")
    public List<WorkItem> range(@RequestParam LocalDate from, @RequestParam LocalDate to, Authentication auth) {
        if (from.isAfter(to)) {
            throw new org.springframework.web.server.ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "from must be on or before to");
        }
        return repository.findByOwnerIdAndWorkDateBetweenOrderByWorkDateDescCreatedAtAsc(currentUser.get(auth).getId(), from, to);
    }

    @GetMapping("/search")
    public SearchResponse search(@RequestParam LocalDate from, @RequestParam LocalDate to,
                                 @RequestParam(required = false) LocalDate beforeDate,
                                 @RequestParam(required = false) WorkItem.ItemType type,
                                 @RequestParam(required = false) Long projectId,
                                 @RequestParam(defaultValue = "") String query,
                                 @RequestParam(defaultValue = "10") int limitDays, Authentication auth) {
        if (from.isAfter(to)) {
            throw new org.springframework.web.server.ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "from must be on or before to");
        }
        Long ownerId = currentUser.get(auth).getId();
        int limit = Math.max(1, Math.min(limitDays, 30));
        String normalizedQuery = query.trim();
        boolean includeCarried = type != WorkItem.ItemType.TODO;
        List<LocalDate> matchingDates = repository.findSearchDates(ownerId, from, to, beforeDate, type, projectId,
                normalizedQuery, includeCarried, PageRequest.of(0, limit + 1));
        boolean hasMore = matchingDates.size() > limit;
        List<LocalDate> pageDates = hasMore ? matchingDates.subList(0, limit) : matchingDates;
        List<WorkItem> items = pageDates.isEmpty()
                ? List.of()
                : repository.findSearchItems(ownerId, pageDates, type, projectId, normalizedQuery, includeCarried);
        LocalDate nextBeforeDate = hasMore ? pageDates.getLast() : null;
        return new SearchResponse(items, hasMore, nextBeforeDate,
                repository.countSearchItems(ownerId, from, to, type, projectId, normalizedQuery, includeCarried),
                repository.countSearchDates(ownerId, from, to, type, projectId, normalizedQuery, includeCarried));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public WorkItem create(@Valid @RequestBody CreateRequest request, Authentication auth) {
        AppUser owner = currentUser.get(auth);
        Project project = request.projectId() == null ? null : projectRepository.findByIdAndOwnerId(request.projectId(), owner.getId()).orElseThrow();
        return repository.save(new WorkItem(request.workDate(), request.type(), request.content().trim(), project, owner));
    }

    @PostMapping("/carry-over")
    @org.springframework.transaction.annotation.Transactional
    public List<WorkItem> carryOver(@Valid @RequestBody CarryOverRequest request, Authentication auth) {
        AppUser owner = currentUser.get(auth);
        List<WorkItem> source = repository.findByOwnerIdAndWorkDateOrderByCreatedAtAsc(owner.getId(), request.fromDate()).stream()
                .filter(item -> item.getType() == WorkItem.ItemType.TODO)
                .filter(item -> item.getCarriedToDate() == null)
                .toList();
        Set<String> existingContents = repository.findByOwnerIdAndWorkDateOrderByCreatedAtAsc(owner.getId(), request.toDate()).stream()
                .filter(item -> item.getType() == WorkItem.ItemType.TODO)
                .map(WorkItem::getContent)
                .collect(Collectors.toSet());
        List<WorkItem> copies = new java.util.ArrayList<>();
        for (WorkItem item : source) {
            if (existingContents.contains(item.getContent())) continue;
            String flowId = item.getFlowId() == null ? UUID.randomUUID().toString() : item.getFlowId();
            WorkItem copy = new WorkItem(request.toDate(), WorkItem.ItemType.TODO, item.getContent(), item.getProject(), owner);
            copy.setFlowId(flowId);
            copy.setFlowCurrentDate(request.toDate());
            item.setFlowId(flowId);
            item.setCarriedToDate(request.toDate());
            for (WorkItem linked : repository.findByOwnerIdAndFlowIdOrderByWorkDateAscCreatedAtAsc(owner.getId(), flowId)) {
                linked.setFlowCurrentDate(request.toDate());
            }
            item.setFlowCurrentDate(request.toDate());
            repository.save(item);
            copies.add(copy);
        }
        return repository.saveAll(copies);
    }

    @GetMapping("/backup")
    public BackupResponse backup(Authentication auth) {
        AppUser owner = currentUser.get(auth);
        List<BackupItem> items = repository.findByOwnerId(owner.getId()).stream()
                .sorted(Comparator.comparing(WorkItem::getWorkDate).thenComparing(WorkItem::getCreatedAt))
                .map(item -> new BackupItem(item.getWorkDate(), item.getType(), item.getContent(),
                        item.getProject() == null ? null : item.getProject().getId(), item.getFlowId(),
                        item.getCarriedToDate(), item.getFlowCurrentDate(), item.getFlowCompletedDate()))
                .toList();
        List<BackupProject> projects = projectRepository.findByOwnerIdOrderByArchivedAscNameAsc(owner.getId()).stream()
                .map(project -> new BackupProject(project.getId(), project.getName(), project.getColor(), project.isArchived()))
                .toList();
        return new BackupResponse(3, Instant.now(), projects, items);
    }

    @PostMapping("/restore")
    @org.springframework.transaction.annotation.Transactional
    public List<WorkItem> restore(@Valid @RequestBody RestoreRequest request, Authentication auth) {
        AppUser owner = currentUser.get(auth);
        if (request.schemaVersion() < 1 || request.schemaVersion() > 3) {
            throw new org.springframework.web.server.ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Unsupported backup schema version");
        }
        Map<Long, Project> restoredProjects = new HashMap<>();
        if (request.replaceExisting()) {
            repository.deleteByOwnerId(owner.getId());
            projectRepository.deleteByOwnerId(owner.getId());
        }
        if (request.projects() != null) {
            for (BackupProject backupProject : request.projects()) {
                Project project = new Project(backupProject.name(), backupProject.color(), owner);
                project.setArchived(backupProject.archived());
                restoredProjects.put(backupProject.id(), projectRepository.save(project));
            }
        }
        List<WorkItem> restored = request.items().stream().map(item -> {
            WorkItem restoredItem = new WorkItem(item.workDate(), item.type(), item.content().trim(),
                    item.projectId() == null ? null : restoredProjects.get(item.projectId()), owner);
            restoredItem.setFlowId(item.flowId());
            restoredItem.setCarriedToDate(item.carriedToDate());
            restoredItem.setFlowCurrentDate(item.flowCurrentDate());
            restoredItem.setFlowCompletedDate(item.flowCompletedDate());
            return restoredItem;
        }).toList();
        return repository.saveAll(restored);
    }

    @PatchMapping("/{id}/type")
    @org.springframework.transaction.annotation.Transactional
    public WorkItem changeType(@PathVariable Long id, @RequestBody TypeRequest request, Authentication auth) {
        WorkItem item = ownedItem(id, auth);
        if (item.getFlowId() == null) {
            item.setType(request.type());
            return repository.save(item);
        }
        List<WorkItem> flow = repository.findByOwnerIdAndFlowIdOrderByWorkDateAscCreatedAtAsc(
                currentUser.get(auth).getId(), item.getFlowId());
        WorkItem current = flow.stream().filter(linked -> linked.getCarriedToDate() == null).reduce((first, second) -> second)
                .orElse(item);
        current.setType(request.type());
        LocalDate completedDate = request.type() == WorkItem.ItemType.DONE ? current.getWorkDate() : null;
        flow.forEach(linked -> linked.setFlowCompletedDate(completedDate));
        repository.saveAll(flow);
        return current;
    }

    @PatchMapping("/{id}/content")
    public WorkItem changeContent(@PathVariable Long id, @Valid @RequestBody ContentRequest request, Authentication auth) {
        WorkItem item = ownedItem(id, auth);
        item.setContent(request.content().trim());
        return repository.save(item);
    }

    @PatchMapping("/{id}/project")
    public WorkItem changeProject(@PathVariable Long id, @RequestBody ProjectRequest request, Authentication auth) {
        AppUser owner = currentUser.get(auth);
        WorkItem item = repository.findByIdAndOwnerId(id, owner.getId()).orElseThrow();
        item.setProject(request.projectId() == null ? null : projectRepository.findByIdAndOwnerId(request.projectId(), owner.getId()).orElseThrow());
        return repository.save(item);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @org.springframework.transaction.annotation.Transactional
    public void delete(@PathVariable Long id, Authentication auth) {
        AppUser owner = currentUser.get(auth);
        WorkItem item = repository.findByIdAndOwnerId(id, owner.getId()).orElseThrow();
        if (item.getFlowId() == null || item.getCarriedToDate() != null) {
            repository.delete(item);
            return;
        }
        List<WorkItem> remaining = new java.util.ArrayList<>(
                repository.findByOwnerIdAndFlowIdOrderByWorkDateAscCreatedAtAsc(owner.getId(), item.getFlowId()));
        remaining.removeIf(linked -> linked.getId().equals(item.getId()));
        repository.delete(item);
        if (remaining.isEmpty()) return;
        WorkItem previous = remaining.getLast();
        previous.setCarriedToDate(null);
        remaining.forEach(linked -> {
            linked.setFlowCurrentDate(previous.getWorkDate());
            linked.setFlowCompletedDate(null);
        });
        repository.saveAll(remaining);
    }

    private WorkItem ownedItem(Long id, Authentication auth) {
        return repository.findByIdAndOwnerId(id, currentUser.get(auth).getId()).orElseThrow();
    }

    public record CreateRequest(@NotNull LocalDate workDate, @NotNull WorkItem.ItemType type,
                                @NotBlank String content, Long projectId) {}
    public record TypeRequest(@NotNull WorkItem.ItemType type) {}
    public record ContentRequest(@NotBlank String content) {}
    public record ProjectRequest(Long projectId) {}
    public record SearchResponse(List<WorkItem> items, boolean hasMore, LocalDate nextBeforeDate,
                                 long totalItems, long totalDays) {}
    public record CarryOverRequest(@NotNull LocalDate fromDate, @NotNull LocalDate toDate) {}
    public record BackupProject(Long id, @NotBlank String name, String color, boolean archived) {}
    public record BackupItem(@NotNull LocalDate workDate, @NotNull WorkItem.ItemType type,
                             @NotBlank String content, Long projectId, String flowId,
                             LocalDate carriedToDate, LocalDate flowCurrentDate, LocalDate flowCompletedDate) {}
    public record BackupResponse(int schemaVersion, Instant exportedAt, List<BackupProject> projects,
                                 List<BackupItem> items) {}
    public record RestoreRequest(int schemaVersion, boolean replaceExisting,
                                 List<@Valid BackupProject> projects,
                                 @NotNull List<@Valid BackupItem> items) {}
}
