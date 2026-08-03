package com.worklog.backend.config;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ProdDataSourceConfigTests {
    @Test
    void convertsNeonConnectionUrlToJdbcWithoutDroppingSslOptions() {
        var connection = ProdDataSourceConfig.parse(
                "postgresql://worklog:p%40ss@ep-example.neon.tech/worklog?sslmode=require&channel_binding=require");

        assertThat(connection.jdbcUrl()).isEqualTo(
                "jdbc:postgresql://ep-example.neon.tech:5432/worklog?sslmode=require&channelBinding=require");
        assertThat(connection.username()).isEqualTo("worklog");
        assertThat(connection.password()).isEqualTo("p@ss");
    }

    @Test
    void rejectsNonPostgresConnectionUrl() {
        assertThatThrownBy(() -> ProdDataSourceConfig.parse("mysql://user:password@localhost/worklog"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("PostgreSQL");
    }
}
