# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module Permission
      extend Peal::Internal::Types::Enum

      ACTIVITY_READ = "activity:read"
      ANALYTICS_READ = "analytics:read"
      API_KEY_CREATE = "apiKey:create"
      API_KEY_READ = "apiKey:read"
      API_KEY_UPDATE = "apiKey:update"
      API_KEY_DELETE = "apiKey:delete"
      ASSISTANT_USE = "assistant:use"
      BILLING_READ = "billing:read"
      BILLING_MANAGE = "billing:manage"
      CHANNEL_READ = "channel:read"
      CHANNEL_CONNECT = "channel:connect"
      CHANNEL_DISCONNECT = "channel:disconnect"
      INVITATION_CREATE = "invitation:create"
      INVITATION_CANCEL = "invitation:cancel"
      MEDIA_READ = "media:read"
      MEDIA_UPLOAD = "media:upload"
      MEDIA_DELETE = "media:delete"
      MEMBER_CREATE = "member:create"
      MEMBER_UPDATE = "member:update"
      MEMBER_DELETE = "member:delete"
      ORGANIZATION_UPDATE = "organization:update"
      ORGANIZATION_DELETE = "organization:delete"
      PARTNER_READ = "partner:read"
      PARTNER_MANAGE = "partner:manage"
      POST_READ = "post:read"
      POST_CREATE = "post:create"
      POST_UPDATE = "post:update"
      POST_DELETE = "post:delete"
      POST_SCHEDULE = "post:schedule"
      POST_APPROVE = "post:approve"
      POST_PUBLISH = "post:publish"
      WEBHOOK_READ = "webhook:read"
      WEBHOOK_MANAGE = "webhook:manage"
    end
  end
end
