# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class AssistantStatus < Internal::Types::Model
      field :available, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :daily_limit, -> { Integer }, optional: false, nullable: false, api_name: "dailyLimit"

      field :images, -> { Peal::Types::AssistantImagesStatus }, optional: false, nullable: false

      field :max_text_length, -> { Integer }, optional: false, nullable: false, api_name: "maxTextLength"

      field :month, -> { Peal::Types::AssistantMonth }, optional: false, nullable: true

      field :reason, -> { Peal::Types::AssistantOffReason }, optional: false, nullable: true

      field :remaining, -> { Integer }, optional: false, nullable: false

      field :resets_at, -> { String }, optional: false, nullable: false, api_name: "resetsAt"

      field :source, -> { Peal::Types::AssistantTextSource }, optional: false, nullable: true
    end
  end
end
