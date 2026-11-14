# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class InboxConversation < Internal::Types::Model
      field :channel_id, -> { String }, optional: false, nullable: false, api_name: "channelId"

      field :id, -> { String }, optional: false, nullable: false

      field :last_incoming_at, -> { String }, optional: false, nullable: true, api_name: "lastIncomingAt"

      field :last_message_at, -> { String }, optional: false, nullable: false, api_name: "lastMessageAt"

      field :messages, -> { Integer }, optional: false, nullable: false

      field :participants, -> { Internal::Types::Array[Peal::Types::InboxParticipant] }, optional: false, nullable: false

      field :read_at, -> { String }, optional: false, nullable: true, api_name: "readAt"

      field :request, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :unread, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
