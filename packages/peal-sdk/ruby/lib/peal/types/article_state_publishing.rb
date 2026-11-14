# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ArticleStatePublishing < Internal::Types::Model
      field :scheduled_at, -> { String }, optional: false, nullable: false, api_name: "scheduledAt"

      field :time_zone, -> { String }, optional: false, nullable: false, api_name: "timeZone"

      field :since, -> { String }, optional: false, nullable: false
    end
  end
end
