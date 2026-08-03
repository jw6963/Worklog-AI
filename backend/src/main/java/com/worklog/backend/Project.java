package com.worklog.backend;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
public class Project {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @NotBlank @Column(length = 80) private String name;
    @Column(length = 20) private String color;
    private boolean archived;
    private LocalDateTime createdAt;
    @JsonIgnore @ManyToOne(fetch = FetchType.LAZY)
    private AppUser owner;

    protected Project() {}
    public Project(String name, String color) {
        this(name, color, null);
    }
    public Project(String name, String color, AppUser owner) {
        this.name = name.trim();
        this.color = color;
        this.createdAt = LocalDateTime.now();
        this.owner = owner;
    }
    public Long getId() { return id; }
    public String getName() { return name; }
    public String getColor() { return color; }
    public boolean isArchived() { return archived; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public AppUser getOwner() { return owner; }
    public void setName(String name) { this.name = name.trim(); }
    public void setColor(String color) { this.color = color; }
    public void setArchived(boolean archived) { this.archived = archived; }
    public void setOwner(AppUser owner) { this.owner = owner; }
}
