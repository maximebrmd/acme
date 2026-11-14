# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class InboxOutgoingMessage < Internal::Types::Model
      field :author_id, -> { String }, optional: false, nullable: true, api_name: "authorId"

      field :conversation_id, -> { String }, optional: false, nullable: false, api_name: "conversationId"

      field :created_at, -> { String }, optional: false, nullable: false, api_name: "createdAt"

      field :id, -> { String }, optional: false, nullable: false

      field :platform_message_id, -> { String }, optional: false, nullable: true, api_name: "platformMessageId"

      field :reason, -> { Peal::Types::InboxOutgoingMessageReason }, optional: false, nullable: true

      field :settled_at, -> { String }, optional: false, nullable: true, api_name: "settledAt"

      field :status, -> { Peal::Types::InboxOutgoingMessageStatus }, optional: false, nullable: false

      field :text, -> { String }, optional: false, nullable: false
    end
  end
end
