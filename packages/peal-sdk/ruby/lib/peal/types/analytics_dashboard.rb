# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class AnalyticsDashboard < Internal::Types::Model
      field :followers, -> { Peal::Types::FollowerChange }, optional: false, nullable: false

      field :previous_followers, -> { Peal::Types::FollowerChange }, optional: false, nullable: false, api_name: "previousFollowers"

      field :previous_kept, -> { Internal::Types::Boolean }, optional: false, nullable: false, api_name: "previousKept"

      field :previous_totals, -> { Peal::Types::DashboardTotals }, optional: false, nullable: false, api_name: "previousTotals"

      field :totals, -> { Peal::Types::DashboardTotals }, optional: false, nullable: false

      field :channels, -> { Internal::Types::Array[Peal::Types::ChannelDashboard] }, optional: false, nullable: false

      field :days, -> { Internal::Types::Array[Peal::Types::DashboardDay] }, optional: false, nullable: false

      field :from, -> { String }, optional: false, nullable: false

      field :platforms, -> { Internal::Types::Array[Peal::Types::PlatformDashboard] }, optional: false, nullable: false

      field :previous, -> { Peal::Types::AnalyticsDashboardPrevious }, optional: false, nullable: false

      field :time_zone, -> { String }, optional: false, nullable: false, api_name: "timeZone"

      field :to, -> { String }, optional: false, nullable: false

      field :top_posts, -> { Internal::Types::Array[Peal::Types::TopPost] }, optional: false, nullable: false, api_name: "topPosts"
    end
  end
end
