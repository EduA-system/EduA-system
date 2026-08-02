CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    sender_id UUID NOT NULL REFERENCES app_users(id),
    subject VARCHAR(20) NOT NULL,
    title VARCHAR(200) NOT NULL,
    content VARCHAR(2000) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE notification_recipients (
    id UUID PRIMARY KEY,
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES app_users(id),
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL,
    UNIQUE (notification_id, recipient_id)
);

CREATE INDEX idx_notification_recipients_recipient ON notification_recipients (recipient_id, read_at);
CREATE INDEX idx_notifications_sender ON notifications (sender_id);
