# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class WebhooksNotConfiguredEncoded < Internal::Types::Model
      field :tag, -> { Peal::Types::WebhooksNotConfiguredEncodedTag }, optional: false, nullable: false, api_name: "_tag"
    end
  end
end
