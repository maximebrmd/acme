# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class OwnImageLimitReachedEncoded < Internal::Types::Model
      field :code, -> { String }, optional: true, nullable: false

      field :message, -> { String }, optional: true, nullable: false

      field :request_id, -> { String }, optional: true, nullable: false, api_name: "requestId"

      field :daily_limit, -> { Integer }, optional: false, nullable: false, api_name: "dailyLimit"

      field :resets_at, -> { String }, optional: false, nullable: false, api_name: "resetsAt"
    end
  end
end
