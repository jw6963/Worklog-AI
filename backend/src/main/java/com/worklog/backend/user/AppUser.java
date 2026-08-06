package com.worklog.backend.user;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.time.Instant;

@Entity
@Table(name = "app_user", uniqueConstraints = @UniqueConstraint(columnNames = "username"))
public class AppUser {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 80)
    private String username;
    @Column(nullable = false)
    private String passwordHash;
    @Column(nullable = false, length = 80)
    private String displayName;
    @Column(nullable = false)
    private boolean enabled = true;
    @Enumerated(EnumType.STRING) @Column(length = 20)
    private Role role = Role.USER;
    private Boolean mustChangePassword = true;
    private LocalDateTime passwordChangedAt;
    @Column(nullable = false, columnDefinition = "integer default 0")
    private int failedLoginAttempts = 0;
    private Instant loginLockedUntil;

    protected AppUser() {}

    public AppUser(String username, String passwordHash, String displayName) {
        this(username, passwordHash, displayName, Role.USER, true);
    }

    public AppUser(String username, String passwordHash, String displayName, Role role, boolean mustChangePassword) {
        this.username = username;
        this.passwordHash = passwordHash;
        this.displayName = displayName;
        this.role = role;
        this.mustChangePassword = mustChangePassword;
    }

    public Long getId() { return id; }
    public String getUsername() { return username; }
    public String getPasswordHash() { return passwordHash; }
    public String getDisplayName() { return displayName; }
    public boolean isEnabled() { return enabled; }
    public Role getRole() { return role == null ? Role.USER : role; }
    public boolean isMustChangePassword() { return Boolean.TRUE.equals(mustChangePassword); }
    public LocalDateTime getPasswordChangedAt() { return passwordChangedAt; }
    public int getFailedLoginAttempts() { return failedLoginAttempts; }
    public Instant getLoginLockedUntil() { return loginLockedUntil; }
    public void setDisplayName(String displayName) { this.displayName = displayName.trim(); }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public void setRole(Role role) { this.role = role; }
    public void setPassword(String passwordHash, boolean mustChangePassword) {
        this.passwordHash = passwordHash;
        this.mustChangePassword = mustChangePassword;
        this.passwordChangedAt = mustChangePassword ? null : LocalDateTime.now();
        resetLoginFailures();
    }
    public boolean isLoginLocked(Instant now) {
        return loginLockedUntil != null && loginLockedUntil.isAfter(now);
    }
    public void recordLoginFailure(int maximumAttempts, Instant lockedUntil) {
        failedLoginAttempts++;
        if (failedLoginAttempts >= maximumAttempts) loginLockedUntil = lockedUntil;
    }
    public void resetLoginFailures() {
        failedLoginAttempts = 0;
        loginLockedUntil = null;
    }

    public enum Role { ADMIN, USER }
}
