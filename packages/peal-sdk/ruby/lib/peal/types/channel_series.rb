# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ChannelSeries < Internal::Types::Model
      field :channel_id, -> { String }, optional: false, nullable: false, api_name: "channelId"

      field :days, -> { Internal::Types::Array[Peal::Types::ChannelDay] }, optional: false, nullable: false

      field :followers, -> { Peal::Types::FollowerChange }, optional: false, nullable: false

      field :from, -> { String }, optional: false, nullable: false

      field :platform, -> { Peal::Types::Platform }, optional: false, nullable: true

      field :time_zone, -> { String }, optional: false, nullable: false, api_name: "timeZone"

      field :to, -> { String }, optional: false, nullable: false

      field :totals, -> { Peal::Types::DashboardTotals }, optional: false, nullable: false
    end
  end
end
