package com.worklog.backend.workitem;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Pageable;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface WorkItemRepository extends JpaRepository<WorkItem, Long> {
    List<WorkItem> findByOwnerIdAndWorkDateOrderByCreatedAtAsc(Long ownerId, LocalDate workDate);
    List<WorkItem> findByOwnerIdAndWorkDateBetweenOrderByWorkDateDescCreatedAtAsc(Long ownerId, LocalDate from, LocalDate to);
    List<WorkItem> findByOwnerIdAndProjectId(Long ownerId, Long projectId);
    long countByOwnerIdAndProjectId(Long ownerId, Long projectId);
    List<WorkItem> findByOwnerId(Long ownerId);
    Optional<WorkItem> findByIdAndOwnerId(Long id, Long ownerId);
    List<WorkItem> findByOwnerIdAndFlowIdOrderByWorkDateAscCreatedAtAsc(Long ownerId, String flowId);
    List<WorkItem> findByOwnerIsNull();
    void deleteByOwnerId(Long ownerId);

    @Query("""
            select distinct w.workDate from WorkItem w
            where w.owner.id = :ownerId and w.workDate between :from and :to
              and (:beforeDate is null or w.workDate < :beforeDate)
              and (:type is null or w.type = :type)
              and (:includeCarried = true or w.carriedToDate is null)
              and (:projectId is null or w.project.id = :projectId)
              and (:query = '' or lower(w.content) like lower(concat('%', :query, '%')))
            order by w.workDate desc
            """)
    List<LocalDate> findSearchDates(@Param("ownerId") Long ownerId, @Param("from") LocalDate from, @Param("to") LocalDate to,
                                    @Param("beforeDate") LocalDate beforeDate, @Param("type") WorkItem.ItemType type,
                                    @Param("projectId") Long projectId, @Param("query") String query,
                                    @Param("includeCarried") boolean includeCarried, Pageable pageable);

    @Query("""
            select w from WorkItem w where w.owner.id = :ownerId and w.workDate in :dates
              and (:type is null or w.type = :type)
              and (:includeCarried = true or w.carriedToDate is null)
              and (:projectId is null or w.project.id = :projectId)
              and (:query = '' or lower(w.content) like lower(concat('%', :query, '%')))
            order by w.workDate desc, w.createdAt asc
            """)
    List<WorkItem> findSearchItems(@Param("ownerId") Long ownerId, @Param("dates") List<LocalDate> dates,
                                   @Param("type") WorkItem.ItemType type, @Param("projectId") Long projectId,
                                   @Param("query") String query, @Param("includeCarried") boolean includeCarried);

    @Query("""
            select count(w) from WorkItem w where w.owner.id = :ownerId and w.workDate between :from and :to
              and (:type is null or w.type = :type) and (:projectId is null or w.project.id = :projectId)
              and (:includeCarried = true or w.carriedToDate is null)
              and (:query = '' or lower(w.content) like lower(concat('%', :query, '%')))
            """)
    long countSearchItems(@Param("ownerId") Long ownerId, @Param("from") LocalDate from, @Param("to") LocalDate to,
                          @Param("type") WorkItem.ItemType type, @Param("projectId") Long projectId, @Param("query") String query,
                          @Param("includeCarried") boolean includeCarried);

    @Query("""
            select count(distinct w.workDate) from WorkItem w where w.owner.id = :ownerId and w.workDate between :from and :to
              and (:type is null or w.type = :type) and (:projectId is null or w.project.id = :projectId)
              and (:includeCarried = true or w.carriedToDate is null)
              and (:query = '' or lower(w.content) like lower(concat('%', :query, '%')))
            """)
    long countSearchDates(@Param("ownerId") Long ownerId, @Param("from") LocalDate from, @Param("to") LocalDate to,
                          @Param("type") WorkItem.ItemType type, @Param("projectId") Long projectId, @Param("query") String query,
                          @Param("includeCarried") boolean includeCarried);
}
