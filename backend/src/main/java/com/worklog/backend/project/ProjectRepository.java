package com.worklog.backend.project;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ProjectRepository extends JpaRepository<Project, Long> {
    List<Project> findByOwnerIdOrderByArchivedAscNameAsc(Long ownerId);
    Optional<Project> findByIdAndOwnerId(Long id, Long ownerId);
    List<Project> findByOwnerIsNull();
    void deleteByOwnerId(Long ownerId);
}
