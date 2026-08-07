package com.worklog.backend.search;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.worklog.backend.user.AppUser;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
public class SavedSearch {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(length = 50, nullable = false) private String name;
    @Column(length = 10, nullable = false) private String period;
    private LocalDate fromDate;
    private LocalDate toDate;
    @Column(length = 10) private String itemType;
    private Long projectId;
    @Column(length = 200) private String query;
    private LocalDateTime createdAt;
    @JsonIgnore @ManyToOne(fetch = FetchType.LAZY, optional = false) private AppUser owner;

    protected SavedSearch() {}
    public SavedSearch(String name, String period, LocalDate fromDate, LocalDate toDate, String itemType,
                       Long projectId, String query, AppUser owner) {
        update(name, period, fromDate, toDate, itemType, projectId, query);
        this.owner = owner;
        this.createdAt = LocalDateTime.now();
    }
    public void update(String name, String period, LocalDate fromDate, LocalDate toDate, String itemType,
                       Long projectId, String query) {
        this.name = name.trim(); this.period = period; this.fromDate = fromDate; this.toDate = toDate;
        this.itemType = itemType; this.projectId = projectId; this.query = query == null ? "" : query.trim();
    }
    public Long getId() { return id; }
    public String getName() { return name; }
    public String getPeriod() { return period; }
    public LocalDate getFromDate() { return fromDate; }
    public LocalDate getToDate() { return toDate; }
    public String getItemType() { return itemType; }
    public Long getProjectId() { return projectId; }
    public String getQuery() { return query; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
