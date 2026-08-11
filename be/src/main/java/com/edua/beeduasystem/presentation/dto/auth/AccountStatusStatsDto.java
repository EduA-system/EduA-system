package com.edua.beeduasystem.presentation.dto.auth;

import com.edua.beeduasystem.service.auth.AccountStatusStats;

public record AccountStatusStatsDto(long active, long disabled) {
    public static AccountStatusStatsDto from(AccountStatusStats stats) {
        return new AccountStatusStatsDto(stats.active(), stats.disabled());
    }
}
