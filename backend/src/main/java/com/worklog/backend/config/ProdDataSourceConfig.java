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

@Configuration
@Profile("prod")
public class ProdDataSourceConfig {
    @Bean
    DataSource dataSource(@Value("${DB_URL}") String databaseUrl) {
        URI uri = URI.create(databaseUrl);
        if (!"postgresql".equals(uri.getScheme()) && !"postgres".equals(uri.getScheme())) {
            throw new IllegalArgumentException("DB_URL must be a PostgreSQL connection URL");
        }
        String[] credentials = uri.getRawUserInfo().split(":", 2);
        if (credentials.length != 2) throw new IllegalArgumentException("DB_URL must contain database credentials");

        HikariDataSource dataSource = new HikariDataSource();
        dataSource.setDriverClassName("org.postgresql.Driver");
        dataSource.setJdbcUrl("jdbc:postgresql://" + uri.getHost() + ":" + port(uri) + uri.getPath());
        dataSource.setUsername(decode(credentials[0]));
        dataSource.setPassword(decode(credentials[1]));
        return dataSource;
    }

    private int port(URI uri) { return uri.getPort() < 0 ? 5432 : uri.getPort(); }
    private String decode(String value) { return URLDecoder.decode(value, StandardCharsets.UTF_8); }
}
