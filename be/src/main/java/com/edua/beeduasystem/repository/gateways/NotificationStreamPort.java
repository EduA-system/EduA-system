package com.edua.beeduasystem.repository.gateways;

import java.util.UUID;

/** Đẩy tin thông báo mới tới một recipient đang có kết nối STOMP mở. */
public interface NotificationStreamPort {

    void publishNew(UUID recipientUserId, NotificationEvent event);
}
