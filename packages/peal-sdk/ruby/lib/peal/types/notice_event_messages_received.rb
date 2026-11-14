# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class NoticeEventMessagesReceived < Internal::Types::Model
      field :channel, -> { Peal::Types::NoticeChannel }, optional: false, nullable: false

      field :conversation_id, -> { String }, optional: false, nullable: false, api_name: "conversationId"

      field :count, -> { Integer }, optional: false, nullable: false
    end
  end
end
