package com.worklog.backend;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.security.SecureRandom;
import java.util.List;

@RestController
@RequestMapping("/api/admin/users")
public class UserAdminController {
    private static final char[] PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%".toCharArray();
    private final SecureRandom random = new SecureRandom();
    private final AppUserRepository users;
    private final PasswordEncoder encoder;

    public UserAdminController(AppUserRepository users, PasswordEncoder encoder) {
        this.users = users;
        this.encoder = encoder;
    }

    @GetMapping
    public List<UserView> list() {
        return users.findAll().stream().map(UserView::from).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TemporaryPasswordResponse create(@Valid @RequestBody CreateUserRequest body) {
        String username = body.username().trim().toLowerCase();
        if (users.findByUsername(username).isPresent()) throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already exists");
        String password = temporaryPassword();
        AppUser user = users.save(new AppUser(username, encoder.encode(password), body.displayName().trim(), AppUser.Role.USER, true));
        return new TemporaryPasswordResponse(UserView.from(user), password);
    }

    @PatchMapping("/{id}/enabled")
    public UserView setEnabled(@PathVariable Long id, @RequestBody EnabledRequest body) {
        AppUser user = users.findById(id).orElseThrow();
        if (user.getRole() == AppUser.Role.ADMIN && !body.enabled()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Administrator cannot be disabled");
        }
        user.setEnabled(body.enabled());
        return UserView.from(users.save(user));
    }

    @PostMapping("/{id}/reset-password")
    public TemporaryPasswordResponse resetPassword(@PathVariable Long id) {
        AppUser user = users.findById(id).orElseThrow();
        String password = temporaryPassword();
        user.setPassword(encoder.encode(password), true);
        return new TemporaryPasswordResponse(UserView.from(users.save(user)), password);
    }

    private String temporaryPassword() {
        StringBuilder value = new StringBuilder(14);
        for (int i = 0; i < 14; i++) value.append(PASSWORD_CHARS[random.nextInt(PASSWORD_CHARS.length)]);
        return value.toString();
    }

    public record CreateUserRequest(
            @NotBlank @Pattern(regexp = "[a-zA-Z0-9._-]{3,40}") String username,
            @NotBlank String displayName) {}
    public record EnabledRequest(boolean enabled) {}
    public record UserView(Long id, String username, String displayName, AppUser.Role role,
                           boolean enabled, boolean mustChangePassword) {
        static UserView from(AppUser user) {
            return new UserView(user.getId(), user.getUsername(), user.getDisplayName(), user.getRole(),
                    user.isEnabled(), user.isMustChangePassword());
        }
    }
    public record TemporaryPasswordResponse(UserView user, String temporaryPassword) {}
}
