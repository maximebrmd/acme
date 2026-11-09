# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class AnalyticsSummary < Internal::Types::Model
      field :channels, -> { Internal::Types::Array[Peal::Types::ChannelMetrics] }, optional: false, nullable: false

      field :days, -> { Internal::Types::Array[Peal::Types::EngagementDay] }, optional: false, nullable: false

      field :from, -> { String }, optional: false, nullable: false

      field :time_zone, -> { String }, optional: false, nullable: false, api_name: "timeZone"

      field :to, -> { String }, optional: false, nullable: false

      field :top_posts, -> { Internal::Types::Array[Peal::Types::TopPost] }, optional: false, nullable: false, api_name: "topPosts"

      field :totals, -> { Peal::Types::MetricTotals }, optional: false, nullable: false
    end
  end
end
