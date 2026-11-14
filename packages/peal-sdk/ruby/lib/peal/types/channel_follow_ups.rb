# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ChannelFollowUps < Internal::Types::Model
      field :channel_id, -> { String }, optional: false, nullable: false, api_name: "channelId"

      field :comment, -> { Peal::Types::FollowUpAbility }, optional: false, nullable: false

      field :platform, -> { Peal::Types::Platform }, optional: false, nullable: false

      field :repost, -> { Peal::Types::FollowUpAbility }, optional: false, nullable: false
    end
  end
end
