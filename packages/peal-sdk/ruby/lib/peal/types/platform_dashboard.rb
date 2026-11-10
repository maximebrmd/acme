# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PlatformDashboard < Internal::Types::Model
      field :followers, -> { Peal::Types::FollowerChange }, optional: false, nullable: false

      field :previous_followers, -> { Peal::Types::FollowerChange }, optional: false, nullable: false, api_name: "previousFollowers"

      field :previous_kept, -> { Internal::Types::Boolean }, optional: false, nullable: false, api_name: "previousKept"

      field :previous_totals, -> { Peal::Types::DashboardTotals }, optional: false, nullable: false, api_name: "previousTotals"

      field :totals, -> { Peal::Types::DashboardTotals }, optional: false, nullable: false

      field :platform, -> { Peal::Types::Platform }, optional: false, nullable: false
    end
  end
end
