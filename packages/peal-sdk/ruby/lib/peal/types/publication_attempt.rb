# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PublicationAttempt < Internal::Types::Model
      field :attempt, -> { Integer }, optional: false, nullable: false

      field :finished_at, -> { String }, optional: false, nullable: false, api_name: "finishedAt"

      field :refusal_code, -> { String }, optional: false, nullable: true, api_name: "refusalCode"

      field :result, -> { Peal::Types::AttemptResult }, optional: false, nullable: false

      field :retry_at, -> { String }, optional: false, nullable: true, api_name: "retryAt"

      field :round, -> { Integer }, optional: false, nullable: false

      field :started_at, -> { String }, optional: false, nullable: false, api_name: "startedAt"

      field :target_id, -> { String }, optional: false, nullable: false, api_name: "targetId"
    end
  end
end
