# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class TextProviderSetting < Internal::Types::Model
      field :provider, -> { Peal::Types::TextProvider }, optional: false, nullable: true
    end
  end
end
