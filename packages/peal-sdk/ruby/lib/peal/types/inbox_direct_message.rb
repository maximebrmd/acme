# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class InboxDirectMessage < Internal::Types::Model
      field :attachments, -> { Integer }, optional: false, nullable: false

      field :conversation_id, -> { String }, optional: false, nullable: false, api_name: "conversationId"

      field :from_account, -> { Internal::Types::Boolean }, optional: false, nullable: false, api_name: "fromAccount"

      field :id, -> { String }, optional: false, nullable: false

      field :sender_platform_id, -> { String }, optional: false, nullable: true, api_name: "senderPlatformId"

      field :sent_at, -> { String }, optional: false, nullable: false, api_name: "sentAt"

      field :text, -> { String }, optional: false, nullable: false
    end
  end
end
