# frozen_string_literal: true

module Peal
  module InboxMessages
    module Types
      class GetConversationInboxMessagesRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :conversation_id, -> { String }, optional: false, nullable: false, api_name: "conversationId"

        field :cursor, -> { String }, optional: true, nullable: false

        field :limit, -> { String }, optional: true, nullable: false
      end
    end
  end
end
