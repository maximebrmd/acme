# frozen_string_literal: true

module Peal
  module InboxMessages
    module Types
      class GetConversationInboxMessagesRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :conversation_id, -> { String }, optional: false, nullable: false, api_name: "conversationId"
      end
    end
  end
end
