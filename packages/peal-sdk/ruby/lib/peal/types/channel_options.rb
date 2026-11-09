# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ChannelOptions < Internal::Types::Model
      field :channel_id, -> { String }, optional: false, nullable: false, api_name: "channelId"

      field :options, -> { Peal::Types::TargetOptions }, optional: false, nullable: false
    end
  end
end
