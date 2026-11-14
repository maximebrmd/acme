# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ArticleStateUnconfirmed < Internal::Types::Model
      field :scheduled_at, -> { String }, optional: false, nullable: false, api_name: "scheduledAt"

      field :time_zone, -> { String }, optional: false, nullable: false, api_name: "timeZone"

      field :attempted_at, -> { String }, optional: false, nullable: false, api_name: "attemptedAt"

      field :reason, -> { Peal::Types::UnconfirmedReason }, optional: false, nullable: false
    end
  end
end
