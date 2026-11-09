# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class EngagementDay < Internal::Types::Model
      field :date, -> { String }, optional: false, nullable: false

      field :likes, -> { Integer }, optional: false, nullable: false

      field :quotes, -> { Integer }, optional: false, nullable: false

      field :replies, -> { Integer }, optional: false, nullable: false

      field :reposts, -> { Integer }, optional: false, nullable: false
    end
  end
end
