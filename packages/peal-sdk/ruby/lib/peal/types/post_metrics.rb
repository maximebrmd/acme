# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PostMetrics < Internal::Types::Model
      field :impressions, -> { Integer }, optional: false, nullable: true

      field :likes, -> { Integer }, optional: false, nullable: false

      field :quotes, -> { Integer }, optional: false, nullable: true

      field :replies, -> { Integer }, optional: false, nullable: false

      field :reposts, -> { Integer }, optional: false, nullable: false
    end
  end
end
