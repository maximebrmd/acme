# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PostWarningQueueChannelsDropped < Internal::Types::Model
      field :channel_ids, -> { Internal::Types::Array[String] }, optional: false, nullable: false, api_name: "channelIds"

      field :queue_id, -> { String }, optional: false, nullable: false, api_name: "queueId"

      field :queue_name, -> { String }, optional: false, nullable: false, api_name: "queueName"
    end
  end
end
