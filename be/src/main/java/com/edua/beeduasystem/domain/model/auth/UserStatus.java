package com.edua.beeduasystem.domain.model.auth;

/** Trạng thái tài khoản. INVITED = đã cấp quyền nhưng chưa đăng nhập lần nào. */
public enum UserStatus {
    INVITED,
    ACTIVE,
    DISABLED
}
