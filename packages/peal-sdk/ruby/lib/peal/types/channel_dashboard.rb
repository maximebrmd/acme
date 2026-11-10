# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ChannelDashboard < Internal::Types::Model
      field :followers, -> { Peal::Types::FollowerChange }, optional: false, nullable: false

      field :previous_followers, -> { Peal::Types::FollowerChange }, optional: false, nullable: false, api_name: "previousFollowers"

      field :previous_totals, -> { Peal::Types::DashboardTotals }, optional: false, nullable: false, api_name: "previousTotals"

      field :totals, -> { Peal::Types::DashboardTotals }, optional: false, nullable: false

      field :channel_id, -> { String }, optional: false, nullable: false, api_name: "channelId"

      field :platform, -> { Peal::Types::Platform }, optional: false, nullable: true
    end
  end
end
