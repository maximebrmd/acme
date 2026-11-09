# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class AssistantQuotaExceededEncoded < Internal::Types::Model
      field :tag, -> { Peal::Types::AssistantQuotaExceededEncodedTag }, optional: false, nullable: false, api_name: "_tag"

      field :daily_limit, -> { Integer }, optional: false, nullable: false, api_name: "dailyLimit"

      field :resets_at, -> { String }, optional: false, nullable: false, api_name: "resetsAt"
    end
  end
end
