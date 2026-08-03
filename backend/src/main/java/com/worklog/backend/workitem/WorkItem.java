package com.worklog.backend.workitem;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.worklog.backend.project.Project;
import com.worklog.backend.user.AppUser;

@Entity
public class WorkItem {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @NotNull private LocalDate workDate;
    @NotNull @Enumerated(EnumType.STRING) private ItemType type;
    @NotBlank @Column(length = 10000) private String content;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    @ManyToOne(fetch = FetchType.EAGER)
    private Project project;
    @JsonIgnore @ManyToOne(fetch = FetchType.LAZY)
    private AppUser owner;

    protected WorkItem() {}

    public WorkItem(LocalDate workDate, ItemType type, String content) {
        this(workDate, type, content, null);
    }

    public WorkItem(LocalDate workDate, ItemType type, String content, Project project) {
        this(workDate, type, content, project, null);
    }

    public WorkItem(LocalDate workDate, ItemType type, String content, Project project, AppUser owner) {
        this.workDate = workDate;
        this.type = type;
        this.content = content;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = this.createdAt;
        this.project = project;
        this.owner = owner;
    }

    public Long getId() { return id; }
    public LocalDate getWorkDate() { return workDate; }
    public ItemType getType() { return type; }
    public String getContent() { return content; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public Project getProject() { return project; }
    public AppUser getOwner() { return owner; }
    public void setType(ItemType type) { this.type = type; }
    public void setContent(String content) { this.content = content; }
    public void setProject(Project project) { this.project = project; }
    public void setOwner(AppUser owner) { this.owner = owner; }

    @PreUpdate
    void markUpdated() { this.updatedAt = LocalDateTime.now(); }

    public enum ItemType { TODO, DONE, NOTE }
}
