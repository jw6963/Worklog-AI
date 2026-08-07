package com.worklog.backend.search;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface SavedSearchRepository extends JpaRepository<SavedSearch, Long> {
    List<SavedSearch> findByOwnerIdOrderByCreatedAtAsc(Long ownerId);
    Optional<SavedSearch> findByIdAndOwnerId(Long id, Long ownerId);
    long countByOwnerId(Long ownerId);
}
