# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ImageProviderSetting < Internal::Types::Model
      field :provider, -> { Peal::Types::ImageProvider }, optional: false, nullable: true
    end
  end
end
