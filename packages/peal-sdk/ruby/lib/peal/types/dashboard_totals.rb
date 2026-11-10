# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class DashboardTotals < Internal::Types::Model
      field :clicks, -> { Integer }, optional: false, nullable: true

      field :engagement, -> { Integer }, optional: false, nullable: false

      field :impressions, -> { Integer }, optional: false, nullable: true

      field :likes, -> { Integer }, optional: false, nullable: false

      field :posts, -> { Integer }, optional: false, nullable: false

      field :quotes, -> { Integer }, optional: false, nullable: true

      field :reach, -> { Integer }, optional: false, nullable: true

      field :replies, -> { Integer }, optional: false, nullable: false

      field :reposts, -> { Integer }, optional: false, nullable: false

      field :saves, -> { Integer }, optional: false, nullable: true
    end
  end
end
