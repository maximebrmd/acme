# frozen_string_literal: true

module Peal
  module InboxMessages
    module Types
      class NewInboxMessage < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :conversation_id, -> { String }, optional: false, nullable: false, api_name: "conversationId"

        field :idempotency_key, -> { String }, optional: true, nullable: false, api_name: "idempotency-key"

        field :text, -> { String }, optional: false, nullable: false
      end
    end
  end
end
