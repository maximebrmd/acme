# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ArticleStateFailed < Internal::Types::Model
      field :scheduled_at, -> { String }, optional: false, nullable: false, api_name: "scheduledAt"

      field :time_zone, -> { String }, optional: false, nullable: false, api_name: "timeZone"

      field :code, -> { String }, optional: false, nullable: true

      field :failed_at, -> { String }, optional: false, nullable: false, api_name: "failedAt"

      field :reason, -> { Peal::Types::FailureReason }, optional: false, nullable: false
    end
  end
end
