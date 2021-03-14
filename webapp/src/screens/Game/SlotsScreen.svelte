<script>
  import BagLayout from 'components/layouts/BagLayout';
  import Header from 'components/bag/Header';
  import Slots from 'components/bag/Slots';
</script>

<BagLayout>
  <div slot="header">
    <Header title="Equip" />
  </div>

  <div slot="content">
    <Slots />
  </div>
</BagLayout>
