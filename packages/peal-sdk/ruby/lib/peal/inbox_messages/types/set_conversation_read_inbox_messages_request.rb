# frozen_string_literal: true

module Peal
  module InboxMessages
    module Types
      class SetConversationReadInboxMessagesRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :conversation_id, -> { String }, optional: false, nullable: false, api_name: "conversationId"

        field :read, -> { Internal::Types::Boolean }, optional: false, nullable: false
      end
    end
  end
end
