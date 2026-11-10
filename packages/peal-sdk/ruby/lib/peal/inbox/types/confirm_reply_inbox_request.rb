# frozen_string_literal: true

module Peal
  module Inbox
    module Types
      class ConfirmReplyInboxRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :reply_id, -> { String }, optional: false, nullable: false, api_name: "replyId"

        field :sent, -> { Internal::Types::Boolean }, optional: false, nullable: false
      end
    end
  end
end
