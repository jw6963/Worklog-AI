package com.worklog.backend.config;

import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import javax.sql.DataSource;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.stream.Collectors;

@Configuration
@Profile("prod")
public class ProdDataSourceConfig {
    @Bean
    DataSource dataSource(@Value("${DB_URL}") String databaseUrl) {
        DatabaseConnection connection = parse(databaseUrl);

        HikariDataSource dataSource = new HikariDataSource();
        dataSource.setDriverClassName("org.postgresql.Driver");
        dataSource.setJdbcUrl(connection.jdbcUrl());
        dataSource.setUsername(connection.username());
        dataSource.setPassword(connection.password());
        return dataSource;
    }

    static DatabaseConnection parse(String databaseUrl) {
        URI uri = URI.create(databaseUrl);
        if (!"postgresql".equals(uri.getScheme()) && !"postgres".equals(uri.getScheme())) {
            throw new IllegalArgumentException("DB_URL must be a PostgreSQL connection URL");
        }
        if (uri.getRawUserInfo() == null || uri.getHost() == null || uri.getPath().isBlank()) {
            throw new IllegalArgumentException("DB_URL must contain database credentials, host, and database name");
        }

        String[] credentials = uri.getRawUserInfo().split(":", 2);
        if (credentials.length != 2) throw new IllegalArgumentException("DB_URL must contain database credentials");

        String query = normalizeQuery(uri.getRawQuery());
        String jdbcUrl = "jdbc:postgresql://" + uri.getHost() + ":" + port(uri) + uri.getPath()
                + (query.isBlank() ? "" : "?" + query);
        return new DatabaseConnection(jdbcUrl, decode(credentials[0]), decode(credentials[1]));
    }

    private static String normalizeQuery(String query) {
        if (query == null || query.isBlank()) return "";
        return Arrays.stream(query.split("&"))
                .map(parameter -> parameter.startsWith("channel_binding=")
                        ? "channelBinding=" + parameter.substring("channel_binding=".length())
                        : parameter)
                .collect(Collectors.joining("&"));
    }

    private static int port(URI uri) { return uri.getPort() < 0 ? 5432 : uri.getPort(); }
    private static String decode(String value) { return URLDecoder.decode(value, StandardCharsets.UTF_8); }

    record DatabaseConnection(String jdbcUrl, String username, String password) {}
}
