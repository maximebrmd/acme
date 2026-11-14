# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ArticleStateScheduled < Internal::Types::Model
      field :scheduled_at, -> { String }, optional: false, nullable: false, api_name: "scheduledAt"

      field :time_zone, -> { String }, optional: false, nullable: false, api_name: "timeZone"
    end
  end
end
