package com.worklog.backend.search;

import com.worklog.backend.auth.CurrentUser;
import com.worklog.backend.user.AppUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/saved-searches")
public class SavedSearchController {
    private final SavedSearchRepository repository;
    private final CurrentUser currentUser;
    public SavedSearchController(SavedSearchRepository repository, CurrentUser currentUser) {
        this.repository = repository; this.currentUser = currentUser;
    }
    @GetMapping public List<SavedSearch> list(Authentication auth) {
        return repository.findByOwnerIdOrderByCreatedAtAsc(currentUser.get(auth).getId());
    }
    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public SavedSearch create(@Valid @RequestBody Request request, Authentication auth) {
        AppUser owner = currentUser.get(auth);
        if (repository.countByOwnerId(owner.getId()) >= 10) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Up to 10 filters can be saved");
        validateDates(request);
        return repository.save(new SavedSearch(request.name(), request.period(), request.fromDate(), request.toDate(),
                normalizeType(request.itemType()), request.projectId(), request.query(), owner));
    }
    @PutMapping("/{id}") public SavedSearch update(@PathVariable Long id, @Valid @RequestBody Request request, Authentication auth) {
        validateDates(request);
        SavedSearch saved = owned(id, auth);
        saved.update(request.name(), request.period(), request.fromDate(), request.toDate(), normalizeType(request.itemType()), request.projectId(), request.query());
        return repository.save(saved);
    }
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, Authentication auth) { repository.delete(owned(id, auth)); }
    private SavedSearch owned(Long id, Authentication auth) {
        return repository.findByIdAndOwnerId(id, currentUser.get(auth).getId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }
    private void validateDates(Request request) {
        if ("CUSTOM".equals(request.period()) && (request.fromDate() == null || request.toDate() == null || request.fromDate().isAfter(request.toDate())))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A valid custom range is required");
    }
    private String normalizeType(String type) { return "ALL".equals(type) ? null : type; }
    public record Request(@NotBlank @Size(max=50) String name,
                          @NotBlank @Pattern(regexp="7D|14D|30D|CUSTOM") String period,
                          LocalDate fromDate, LocalDate toDate,
                          @Pattern(regexp="ALL|TODO|DONE|NOTE") String itemType,
                          Long projectId, @Size(max=200) String query) {}
}
