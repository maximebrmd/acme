# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class AssistantImagesStatus < Internal::Types::Model
      field :aspects, -> { Internal::Types::Array[Peal::Types::ImageAspect] }, optional: false, nullable: false

      field :available, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :daily_limit, -> { Integer }, optional: false, nullable: false, api_name: "dailyLimit"

      field :max_prompt_length, -> { Integer }, optional: false, nullable: false, api_name: "maxPromptLength"

      field :request_cost, -> { Integer }, optional: false, nullable: false, api_name: "requestCost"
    end
  end
end
