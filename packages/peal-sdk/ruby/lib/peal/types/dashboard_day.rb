# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class DashboardDay < Internal::Types::Model
      field :date, -> { String }, optional: false, nullable: false

      field :followers, -> { Integer }, optional: false, nullable: true

      field :likes, -> { Integer }, optional: false, nullable: false

      field :quotes, -> { Integer }, optional: false, nullable: false

      field :reach, -> { Integer }, optional: false, nullable: true

      field :replies, -> { Integer }, optional: false, nullable: false

      field :reposts, -> { Integer }, optional: false, nullable: false

      field :views, -> { Integer }, optional: false, nullable: true
    end
  end
end
